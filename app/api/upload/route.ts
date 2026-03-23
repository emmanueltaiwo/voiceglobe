import { NextResponse } from "next/server";
import { Readable } from "stream";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }
  const buffer = Buffer.from(await audio.arrayBuffer());
  const stream = Readable.from(buffer);

  const result = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "raw", folder: "voiceglobe/voice-notes" },
        (err, result) => (err ? reject(err) : resolve(result!)),
      );
      stream.pipe(uploadStream);
    },
  );

  return NextResponse.json({ audioUrl: result.secure_url });
}
