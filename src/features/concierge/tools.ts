/**
 * The concierge's tools. The model only proposes a call; everything here validates the
 * input itself (tool inputs are streamed eagerly, so the API does not validate them) and
 * works from the same availability data as the booking calendar.
 *
 * offer_booking and offer_whatsapp don't fetch anything: they put a button into the chat
 * (a UI action), so links are always built by our code, never written by the model.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { site, stays } from "@/content/site";
import { rangeHasLockedDay } from "@/features/airbnb-sync/airbnb-calendar";
import { MAX_NIGHTS, nightsBetween } from "@/features/booking/calendar";
import { addDays } from "@/lib/dates";
import type { Locale } from "@/lib/i18n";

const ROOM_SLUGS = stays.map((s) => s.slug) as [string, ...string[]];
/** Airbnb exports about a year of calendar; beyond that we can't say. */
const DAYS_AHEAD = 365;

export type ToolContext = {
  /** Today in Demre (YYYY-MM-DD). */
  today: string;
  locale: Locale;
  /** Booked nights per room, keyed by room name (same data as the booking calendar). */
  lockedByRoom: Record<string, string[]>;
};

export type UiAction = { type: "booking"; href: string } | { type: "whatsapp"; href: string };

export type ToolOutcome = { content: string; isError?: boolean; action?: UiAction };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const availabilityInput = z
  .object({ checkin: isoDate, checkout: isoDate, room: z.enum(ROOM_SLUGS).optional() })
  .strict();

const bookingInput = z
  .object({
    checkin: isoDate.optional(),
    checkout: isoDate.optional(),
    room: z.enum(ROOM_SLUGS).optional(),
    guests: z.number().int().min(1).max(10).optional(),
  })
  .strict();

const whatsappInput = z.object({ message: z.string().min(1).max(500) }).strict();

const roomProperty = {
  type: "string",
  enum: ROOM_SLUGS,
  description:
    "Room id from the knowledge, e.g. ambar-1. Leave out if the guest has no preference.",
};

export const CONCIERGE_TOOLS: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description:
      "Checks which rooms are free for a stay, from the live booking calendar (Airbnb plus confirmed direct bookings). Use it for every question about availability or dates. Check-out is the morning the guest leaves.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        checkin: { type: "string", description: "Arrival date, YYYY-MM-DD" },
        checkout: { type: "string", description: "Departure date, YYYY-MM-DD" },
        room: roomProperty,
      },
      required: ["checkin", "checkout"],
      additionalProperties: false,
    },
  },
  {
    name: "offer_booking",
    description:
      "Shows the guest a button that opens the booking request form, prefilled with whatever is known. Use it when the guest wants to book or asks how to book.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        checkin: { type: "string", description: "Arrival date, YYYY-MM-DD, if known" },
        checkout: { type: "string", description: "Departure date, YYYY-MM-DD, if known" },
        room: roomProperty,
        guests: { type: "integer", description: "Number of adults, if known" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "offer_whatsapp",
    description:
      "Shows the guest a button to message the family on WhatsApp. Use it when the knowledge doesn't answer the question or the guest wants a person.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description:
            "A short message the guest can send, in the guest's language, summing up their question. No personal data.",
        },
      },
      required: ["message"],
      additionalProperties: false,
    },
  },
];

/** Validation problems are returned to the model as tool errors it can explain or fix. */
function invalid(reason: string): ToolOutcome {
  return { content: JSON.stringify({ error: reason }), isError: true };
}

function checkAvailability(raw: unknown, ctx: ToolContext): ToolOutcome {
  const parsed = availabilityInput.safeParse(raw);
  if (!parsed.success) return invalid("invalid_input: dates must be YYYY-MM-DD");
  const { checkin, checkout, room } = parsed.data;
  if (checkin < ctx.today) return invalid(`checkin_in_past: today is ${ctx.today}`);
  if (checkout <= checkin) return invalid("checkout_must_be_after_checkin");
  const nights = nightsBetween(checkin, checkout);
  if (nights > MAX_NIGHTS) return invalid(`stay_too_long: at most ${MAX_NIGHTS} nights`);
  if (checkin > addDays(ctx.today, DAYS_AHEAD)) {
    return invalid("too_far_ahead: the calendar covers about a year; suggest WhatsApp");
  }

  const rooms = stays.filter((s) => (room ? s.slug === room : true));
  return {
    content: JSON.stringify({
      checkin,
      checkout,
      nights,
      rooms: rooms.map((s) =>
        s.slug === "kamp"
          ? {
              id: s.slug,
              name: s.title,
              available: "ask: shared camping area, the family confirms space",
            }
          : {
              id: s.slug,
              name: s.title,
              available: !rangeHasLockedDay(checkin, checkout, ctx.lockedByRoom[s.title] ?? []),
              price_per_night: s.price,
            },
      ),
      note: "From the live calendar. The family confirms every booking.",
    }),
  };
}

function offerBooking(raw: unknown, ctx: ToolContext): ToolOutcome {
  const parsed = bookingInput.safeParse(raw);
  if (!parsed.success) return invalid("invalid_input");
  const { checkin, checkout, room, guests } = parsed.data;
  const params = new URLSearchParams();
  // The booking form drops anything invalid or in the past, so pass on what we have.
  if (checkin) params.set("checkin", checkin);
  if (checkin && checkout) params.set("checkout", checkout);
  if (room) params.set("unit", room);
  if (guests) params.set("guests", String(Math.min(guests, 4)));
  const query = params.toString();
  return {
    content: JSON.stringify({ shown: "booking form button", prefilled: parsed.data }),
    action: { type: "booking", href: `/${ctx.locale}/rezervasyon${query ? `?${query}` : ""}` },
  };
}

function offerWhatsapp(raw: unknown): ToolOutcome {
  const parsed = whatsappInput.safeParse(raw);
  if (!parsed.success) return invalid("invalid_input: message is required");
  const text = parsed.data.message.trim().slice(0, 500);
  return {
    content: JSON.stringify({ shown: "WhatsApp button" }),
    action: { type: "whatsapp", href: `${site.whatsapp}?text=${encodeURIComponent(text)}` },
  };
}

export function runTool(name: string, input: unknown, ctx: ToolContext): ToolOutcome {
  switch (name) {
    case "check_availability":
      return checkAvailability(input, ctx);
    case "offer_booking":
      return offerBooking(input, ctx);
    case "offer_whatsapp":
      return offerWhatsapp(input);
    default:
      return invalid(`unknown_tool: ${name}`);
  }
}
