import fs from 'fs';
import { DeepgramClient } from '@deepgram/sdk';

async function test() {
  const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });
  console.log(Object.keys(deepgram.listen.v1));
  console.log(Object.keys(deepgram.listen.v1.media));
}
test().catch(console.error);
