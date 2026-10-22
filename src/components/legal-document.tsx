import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicFooter } from "@/components/public-footer";
import { LEGAL_DOCUMENTS, type LegalDocumentId } from "@/lib/legal/documents";

export function LegalDocumentPage({ documentId }: { documentId: LegalDocumentId }) {
  const document = LEGAL_DOCUMENTS[documentId];
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5">
          <Button asChild variant="link" className="px-0 font-display text-lg"><Link to="/">BotDiff</Link></Button>
          <Button asChild variant="ghost"><Link to="/"><ArrowLeft /> Home</Link></Button>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="size-4" /> Legal draft · No effective date adopted</div>
        <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">{document.title}</h1>
        <aside aria-label="Draft status" className="mt-6 border-l-4 border-warning bg-warning/10 px-4 py-4 text-sm leading-relaxed">
          <p className="font-semibold text-foreground">Draft — NEEDS OWNER REVIEW</p>
          <p className="mt-1 text-muted-foreground">This document is not an adopted final policy. Material details remain unresolved. Paid billing is not approved for launch.</p>
        </aside>
        <article className="mt-10 space-y-9">
          {document.sections.map((section) => (
            <section key={section.title} aria-label={section.title}>
              <h2 className="font-display text-xl font-semibold leading-snug">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </article>
        <section aria-labelledby="owner-review-heading" className="mt-10 border-t border-border pt-7">
          <h2 id="owner-review-heading" className="font-display text-xl font-semibold">NEEDS OWNER REVIEW — before publication</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
            {document.review.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <nav aria-label="Related legal information" className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            <Link to="/privacy" className="text-primary underline underline-offset-4">Privacy</Link>
            <Link to="/terms" className="text-primary underline underline-offset-4">Terms</Link>
            <Link to="/refunds" className="text-primary underline underline-offset-4">Billing & refunds</Link>
            <Link to="/data-deletion" className="text-primary underline underline-offset-4">Data deletion</Link>
          </nav>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}