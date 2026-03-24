import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Radio — VoiceGlobe",
  description:
    "Stream every voice message on the globe in order—your own session, new and old recordings.",
};

export default function RadioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
