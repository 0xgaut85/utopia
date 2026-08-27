import { SiteHeader } from "@/components/site-header";
import { Newspaper } from "@/components/landing/newspaper";
import { FooterReveal } from "@/components/landing/footer-reveal";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col pb-20 pt-[6.5rem] sm:pb-24 sm:pt-[7.5rem] lg:h-[100svh] lg:overflow-hidden lg:pb-0">
        <Newspaper />
      </main>
      <FooterReveal />
    </>
  );
}
