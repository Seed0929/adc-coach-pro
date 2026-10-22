import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { legalHead } from "@/lib/legal/route-head";

const document = LEGAL_DOCUMENTS["data-deletion"];
export const Route = createFileRoute("/data-deletion")({
  head: () => legalHead(document.title, document.description),
  component: () => <LegalDocumentPage documentId="data-deletion" />,
});
