import Link from "next/link";
import { ColumnShell } from "@/components/landing/column-shell";
import { SectionBlock } from "@/components/landing/section-block";
import { ImagePlaceholder } from "@/components/landing/image-placeholder";
import { LinkRow } from "@/components/landing/link-row";
import { ScrambleText } from "@/components/ui/scramble-text";

const bodyText = "font-mono text-[13px] leading-relaxed text-ink/90";
const inlineLink = "underline underline-offset-2 hover:text-ink/60";

export function ColumnRight() {
  return (
    <ColumnShell index="03" title="Domains" hint="Built for what matters" autoScroll="down">
      <SectionBlock label="Built for what matters" delay={0}>
        <p className={bodyText}>
          * Built for the places that matter most:{" "}
          <ScrambleText text="defense sites" duration={1000} /> where the
          source of an observation has to survive scrutiny, warehouse floors
          and yards that fixed sensors never quite reach, critical
          infrastructure that needs monitoring more often than a scheduled
          inspection allows, and the robots learning to move safely through
          spaces that satellite imagery cannot describe.
        </p>
        <ImagePlaceholder ratio="landscape" src="/image8.png" />
      </SectionBlock>

      <SectionBlock label="Where it already runs" delay={0.05}>
        <p className={bodyText}>
          * In{" "}
          <Link href="/docs/use-cases/sovereign-defense" className={inlineLink}>
            sovereign defense
          </Link>
          , an auditable chain of custody matters more than convenience,
          since every observation has to survive scrutiny long after it was
          captured. In{" "}
          <Link href="/docs/use-cases/autonomous-logistics" className={inlineLink}>
            autonomous logistics
          </Link>
          , spatial awareness helps route and coordinate fleets through
          loading bays and yards that fixed cameras were never installed to
          see.
        </p>
        <p className={bodyText}>
          * For{" "}
          <Link href="/docs/use-cases/critical-infrastructure" className={inlineLink}>
            critical infrastructure
          </Link>
          , monitoring becomes continuous instead of the once a quarter
          inspection that used to be the norm. And for{" "}
          <Link href="/docs/use-cases/embodied-ai" className={inlineLink}>
            embodied AI
          </Link>
          , this is the ground truth a robot needs before it can be trusted
          to move through a space on its own.
        </p>
        <ImagePlaceholder ratio="square" src="/image5.webp" />
      </SectionBlock>

      <SectionBlock label="For organizations">
        <p className={bodyText}>
          * <strong className="font-semibold">Commission a capture of a
          specific place.</strong> Post a bounty describing what you need and
          where, fund it and review submissions as they arrive. Accept the
          one that meets your bar and the reward releases automatically, no
          invoice and no chasing anyone down for it.
        </p>
        <ImagePlaceholder ratio="portrait" src="/image9.png" />
        <LinkRow items={[{ label: "Post a bounty", href: "/docs/contribute/bounties" }]} />
      </SectionBlock>

      <SectionBlock label="Join the network">
        <p className={bodyText}>
          * <strong className="font-semibold">Bring the ground level view to
          your models.</strong> Whether you are capturing a street with your
          phone or querying verified data through the API, everything starts
          at the same door. Open the app to start capturing, or talk to
          sales to scope an{" "}
          <ScrambleText text="enterprise deployment" duration={900} />: both
          paths lead into the same verified record.
        </p>
        <LinkRow
          items={[
            { label: "Open the app", href: "https://app.utopiadata.net" },
            { label: "Talk to sales", href: "/docs/enterprise/overview" },
          ]}
        />
      </SectionBlock>
    </ColumnShell>
  );
}
