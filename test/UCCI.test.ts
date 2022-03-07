import {
  GetELEEYEEngine,
  UCCI,
  RESTART_COMMAND,
  IS_READY,
} from "../src/main/UCCI";

// test("Test ELEEYEEngine", () => {
//   const engine = GetELEEYEEngine();
//   engine.send(UCCI, () => {
//     engine.send(IS_READY, (err, state) => {
//       expect(state).toContain("readyok");
//       setTimeout(() => {
//         engine.quit();
//       }, 1000);
//     });
//   });
// });


test("Test ELEEYEEngineAsync", async () => {
    const engine = GetELEEYEEngine();
    console.log('engine')
    const init = await engine.sendAsync(UCCI);
    console.log(init)
    
    const state = await engine.sendAsync(IS_READY)
    console.log(state)
    expect(state).toContain("readyok");
    const quit = await engine.quit();
});

test("Test infoAndMove", async () => {
  const engine = GetELEEYEEngine();
  const init = await engine.sendAsync(UCCI);
  console.log(init)
  const infoAndMove = await engine.infoAndMove("rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1 moves h2e2",10)
  // expect(infoAndMove.pvList.length).toBeGreaterThan(0)
  expect(infoAndMove.bestmove).not.toBeNull()
  expect(infoAndMove.ponder).not.toBeNull()
  await engine.quit();
});