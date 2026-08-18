import { SiteHeader } from "@/components/site-header";
import { Newspaper } from "@/components/landing/newspaper";
import { FooterReveal } from "@/components/landing/footer-reveal";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col pt-20 sm:pt-24 lg:h-[100svh] lg:overflow-hidden">
        <Newspaper />
      </main>
      <FooterReveal />
    </>
  );
}
