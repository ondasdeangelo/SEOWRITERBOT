import * as esbuild from 'esbuild';
import config from '../esbuild.config.mjs';

async function build() {
  try {
    await esbuild.build(config);
    console.log('✅ Server build completed successfully');
  } catch (error) {
    console.error('❌ Server build failed:', error);
    process.exit(1);
  }
}

build();

