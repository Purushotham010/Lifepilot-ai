import fs from 'fs';
import { DeepgramClient } from '@deepgram/sdk';

async function test() {
  const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });
  console.log(deepgram.listen);
  console.log(deepgram.listen?.v1);
}
test().catch(console.error);
