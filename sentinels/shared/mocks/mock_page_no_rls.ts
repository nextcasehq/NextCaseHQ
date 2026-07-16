export async function POST(request: Request) {
  // Mock file with zero RLS guards and zero PII scrubbing
  return new Response("Successfully uploaded without any security filters!");
}
