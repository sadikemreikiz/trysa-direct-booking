import NotFoundContent from "@/components/NotFoundContent";

/** Rendered when a page calls notFound() (e.g. an unknown room). The root layout (html/body) comes from [lang]/layout. */
export default function NotFound() {
  return <NotFoundContent />;
}
