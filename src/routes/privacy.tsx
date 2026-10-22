import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { legalHead } from "@/lib/legal/route-head";

const document = LEGAL_DOCUMENTS["privacy"];
export const Route = createFileRoute("/privacy")({
  head: () => legalHead(document.title, document.description),
  component: () => <LegalDocumentPage documentId="privacy" />,
});
