import * as child from 'node:child_process'
import * as fs from 'node:fs'
import type { ExecOptions } from './driver/common'

const moduleNames = fs
  .readdirSync(`${process.env.OUTPUT_DIR}/benchmark`)
  .map((dirent) => `benchmark/${dirent}`)

for (const moduleName of moduleNames) {
  const prettyName = moduleName.split('/').pop()
  if (!prettyName) throw new Error('unreachable')

  test(`${prettyName}`, async () => {
    const execOptions: ExecOptions = {
      moduleName,
      asyncify: prettyName.endsWith('.asyncify.wasm'),
      fs: {},
      preopens: [],
      returnOnExit: false,
    }

    // Spawns a child process that runs the wasm so we can isolate the profiling to just that
    // specific test case.
    const proc = child.execFile(
      `node`,
      [
        '--experimental-vm-modules',
        '--cpu-prof',
        '--cpu-prof-dir=../build/test/prof',
        `--cpu-prof-name=${moduleName}.${Date.now()}.cpuprofile`,
        '../build/test/standalone.mjs',
        moduleName,
        JSON.stringify(execOptions),
      ],
      {
        encoding: 'utf8',
      }
    )

    let stderr = ''
    proc.stderr?.on('data', (data) => (stderr += data))

    const exitCode = await new Promise((resolve) => proc.once('exit', resolve))

    if (exitCode !== 0) {
      console.error(`Child process exited with code ${exitCode}:\n${stderr}`)
    }
  })
}