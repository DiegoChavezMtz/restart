import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

function config() {
  const endpoint = process.env.SEAWEEDFS_S3_ENDPOINT;
  const bucket = process.env.SEAWEEDFS_S3_BUCKET;
  const accessKeyId = process.env.SEAWEEDFS_ACCESS_KEY;
  const secretAccessKey = process.env.SEAWEEDFS_SECRET_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Falta configurar SeaweedFS: endpoint, bucket o credenciales.");
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey, region: process.env.SEAWEEDFS_S3_REGION || "us-east-1" };
}

function client() {
  const options = config();
  return {
    bucket: options.bucket,
    s3: new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      forcePathStyle: true,
      // El cliente S3 de AWS agrega checksums flexibles a PUT por defecto.
      // SeaweedFS los interpreta como Content-MD5 y rechaza el cuerpo directo
      // del navegador; sólo solicitamos checksum cuando sea obligatorio.
      requestChecksumCalculation: "WHEN_REQUIRED",
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    }),
  };
}

export function createEvaluationObjectKey(evaluationId: string, participantId: string): string {
  return `evaluations/${evaluationId}/${participantId}/${crypto.randomUUID()}.pdf`;
}

export function isEvaluationObjectKey(key: string, evaluationId: string, participantId: string): boolean {
  return key.startsWith(`evaluations/${evaluationId}/${participantId}/`) && key.endsWith(".pdf");
}

export async function createEvaluationUploadUrl(key: string): Promise<string> {
  const { s3, bucket } = client();
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: "application/pdf" }), { expiresIn: 300 });
}

export async function createEvaluationDownloadUrl(key: string, filename: string): Promise<string> {
  const { s3, bucket } = client();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentType: "application/pdf", ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` }), { expiresIn: 300 });
}

export { MAX_PDF_BYTES };
