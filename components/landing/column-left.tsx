import { ColumnShell } from "@/components/landing/column-shell";
import { SectionBlock } from "@/components/landing/section-block";
import { ImagePlaceholder } from "@/components/landing/image-placeholder";
import { LinkRow } from "@/components/landing/link-row";
import { ScrambleText } from "@/components/ui/scramble-text";

const bodyText = "font-mono text-[13px] leading-relaxed text-ink/90";

export function ColumnLeft() {
  return (
    <ColumnShell
      index="01"
      title="Network"
      hint="Zero capex sensor swarm"
      autoScroll="up"
      divider={false}
    >
      <SectionBlock label="Introduction to Utopia" delay={0}>
        <p className={bodyText}>
          * Coverage that scales with people instead of fleets. Every phone
          that records a capture becomes a sensor the instant the clip is
          uploaded, with more than{" "}
          <ScrambleText text="three billion devices" duration={1200} /> already
          capable of joining the network, nothing to install and nothing to
          ship.
        </p>
        <ImagePlaceholder
          ratio="landscape"
          caption="Street level capture, unedited"
          duration={1000}
          videoSrc="/landing/street-night.mp4"
        />
        <p className={bodyText}>
          * Stairwells, loading bays, market streets and building interiors
          get covered at a resolution that satellites and mapping cars miss
          entirely, and because contributors keep returning to the same
          places, the record updates continuously instead of aging the way a
          map drawn once and left alone eventually does.
        </p>
        <p className={bodyText}>
          * <strong className="font-semibold">No cameras to install. No
          fleets to maintain.</strong> Coverage grows automatically as more
          people join, extending anywhere a phone and a bounty can reach. A
          contributor walks a street, a stairwell or a warehouse aisle and
          records a short multi-angle clip, and faces and vehicle plates are
          blurred on the device before anything ever leaves it, so the
          unblurred footage never exists outside the phone that shot it.
        </p>
      </SectionBlock>

      <SectionBlock label="Related links" delay={0.05}>
        <LinkRow items={[{ label: "Start capturing", href: "/docs/quickstart" }]} />
      </SectionBlock>

      <SectionBlock label="How a capture becomes verified data">
        <ImagePlaceholder
          ratio="wide"
          caption="Ground truth, unretouched"
          duration={1300}
          videoSrc="/landing/ground-truth.mp4"
        />
        <p className={bodyText}>
          * Every clip is fingerprinted and signed the moment it is recorded,
          producing a hash of the content, a coarse location and a timestamp
          that nothing after the fact can quietly edit. Independent captures
          of the same place are then checked against each other, and a{" "}
          <ScrambleText text="confidence score" duration={950} /> climbs as
          more nodes agree on what a location actually looks like.
        </p>
        <p className={bodyText}>
          * What eventually reaches your application is structured data with
          geometry, timestamps and a provenance hash attached, ready to
          query, stream or archive without ever having to take
          Utopia&apos;s word for it.
        </p>
      </SectionBlock>

      <SectionBlock label="For contributors">
        <ImagePlaceholder
          ratio="portrait"
          caption="Contributor, mid-capture"
          duration={1050}
          videoSrc="/landing/contributor.mp4"
        />
        <p className={bodyText}>
          * <strong className="font-semibold">Record what is around you and
          get paid for it.</strong> Connect a wallet, open the capture app in
          any browser and record your first clip. Fulfil an open bounty or
          capture freely and start building a track record on the network,
          the same one that pays out the moment a submission is accepted.
        </p>
        <LinkRow items={[{ label: "Start capturing", href: "/docs/quickstart" }]} />
      </SectionBlock>
    </ColumnShell>
  );
}
