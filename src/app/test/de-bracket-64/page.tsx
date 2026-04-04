"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    CueScore?: {
      Tournament: new (id: number) => {
        createFlowchart: (targetId: string) => unknown;
      };
    };
  }
}

const FLOWCHART_CSS = `
@import url('https://fonts.googleapis.com/css?family=Open+Sans:400,600,700,800');

html, body { background-color: #FFF; font-family: Open Sans, sans-serif; padding: 0; margin: 0; color: #0E2666; width: max-content; }
#Content { padding-top: 0; max-width: 100vw; overflow-x: scroll; overflow-y: visible; }
a, a:link, a:active, a:visited { color: #467DF7; }
a { outline: none; }
.breadcrumbs { width: fit-content; max-width: 100vw; box-sizing: border-box; position: sticky; left: 0; display: flex; align-items: center; padding: 16px 8px; font-size: 12px; text-transform: none; border: 0; }
.breadcrumbs a, .breadcrumbs span { font-size: 12px; padding-left: 17px; background: transparent url(https://cuescore.com/img/arrow-right-blue.svg) left 5px center/6px no-repeat; text-decoration: none; }
.breadcrumbs span { color: #0E26668A; }
.breadcrumbs a:first-child { background: transparent; padding-left: 0; }
.cs-tournament.cs-flowchart .cs-match { background-color: transparent; }
.cs-tournament.cs-flowchart .cs-match.waiting .cs-flowchart-participant-line { background-color: #F3F3F3; }
.cs-tournament.cs-flowchart .cs-match.waiting:nth-child(even) { background-color: transparent; }
.cs-tournament.cs-flowchart .cs-match.playing .cs-flowchart-participant-line { background-color: #467DF7; }
.cs-tournament.cs-flowchart .cs-match.playing:nth-child(even) { background-color: transparent; }
.cs-tournament.cs-flowchart .cs-match.finished .cs-flowchart-participant-line { background-color: #172266; }
.cs-tournament.cs-flowchart .cs-match.finished:nth-child(even) { background-color: transparent; }
.cs-tournament.cs-flowchart .cs-match .cs-score { height: 100%; align-items: center; font-weight: 700; }
.cs-tournament.cs-flowchart .cs-match .cs-matchno { position: static; margin-left: 8px; border-radius: 4px 4px 0 0; }
.cs-tournament.cs-flowchart .cs-match .cs-table { font-size: inherit; }
.cs-flowchart { display: flex; transform-origin: top left; width: fit-content; padding: 0 8px; transition: all .2s ease-in-out; margin-bottom: 148px; }
.cs-flowchart .cs-round-header { }
.cs-flowchart .cs-round-body { display: flex; height: 100%; flex-direction: column; justify-content: space-around; margin: 0; }
.cs-flowchart .cs-round-body .cs-match { height: 96px; width: 250px; overflow: hidden; margin: 2px 0; }
.cs-flowchart .cs-match .cs-participant-name { flex-direction: row; font-size: smaller; white-space: nowrap; text-overflow: ellipsis; max-width: 188px; overflow: hidden; }
.cs-flowchart .cs-match .cs-participant-name .cs-participant-firstname:after { content: " "; display: inline; }
.cs-flowchart .cs-match .cs-participant-name .cs-participant-lastname { text-transform: none; }
.cs-flowchart .cs-match .cs-header { display: flex; justify-content: space-between; background-color: white; color: #808CAC; height: 16px; font-size: 12px; outline: none; }
.cs-flowchart .cs-match .cs-footer { display: flex; justify-content: space-between; background-color: white; color: #808CAC; height: 16px; font-size: 12px; outline: none; }
.walkover { display: block !important; }
.cs-flowchart-participant-line { display: flex; justify-content: space-between; align-items: center; height: 32px; overflow: hidden; }
.cs-flowchart-participant-line:nth-child(even) { border-radius: 8px 8px 0 0; }
.cs-flowchart-participant-line:nth-child(odd) { border-radius: 0 0 8px 8px; }
#ButtonBar { z-index: 2147483647; position: fixed; left: 8px; bottom: 8px; }
div.zoom { z-index: 11; display: inline-block; padding: 8px; background-color: #DBDEE4; opacity: 0.9; border-radius: 4px; }
.zoom .input { cursor: pointer; height: 36px; width: 36px; outline: 0; border: 0; background-color: transparent; background-position: center center; background-size: 36px; background-repeat: no-repeat; margin: 0; padding: 0; color: transparent; font-size: 0; line-height: 36px; }
.zoom .in { background-image: url(https://cuescore.com/img/scoreboard/scoreboard-plus.svg); }
.zoom .out { background-image: url(https://cuescore.com/img/scoreboard/scoreboard-minus.svg); }
.zoom .value { text-align: center; color: #475569; font-size: 14px; font-weight: 600; padding: 8px 0; }
@media only screen and (max-width: 960px) {
  .breadcrumbs { font-size: 16px; }
  .breadcrumbs a, .breadcrumbs span { overflow: hidden; max-width: 50%; white-space: nowrap; text-overflow: ellipsis; min-width: 0; }
  .breadcrumbs *:last-child { display: none; }
}
`;

export default function TestDoubleEliminationBracket64Page() {
  const [zoom, setZoom] = useState(1);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!scriptReady || !window.CueScore) return;
    const target = document.getElementById("cs-tournament");
    if (!target) return;
    target.innerHTML = "";
    new window.CueScore.Tournament(58737796).createFlowchart("cs-tournament");
  }, [scriptReady]);

  useEffect(() => {
    const chart = document.querySelector<HTMLElement>(".cs-flowchart");
    if (!chart) return;
    chart.style.transform = `scale(${zoom})`;
  }, [zoom, scriptReady]);

  useEffect(() => {
    let curYPos = 0;
    let curXPos = 0;
    let curDown = false;

    const onMouseMove = (event: MouseEvent) => {
      if (!curDown) return;
      document.documentElement.scrollTop = document.documentElement.scrollTop + (curYPos - event.pageY);
      document.documentElement.scrollLeft = document.documentElement.scrollLeft + (curXPos - event.pageX);
      curYPos = event.pageY;
      curXPos = event.pageX;
    };

    const onMouseDown = (event: MouseEvent) => {
      curDown = true;
      curYPos = event.pageY;
      curXPos = event.pageX;
      event.preventDefault();
    };

    const onMouseUp = () => {
      curDown = false;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <>
      <Script
        src="https://api.cuescore.com/js/CueScore.min-3.33.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <style jsx global>{FLOWCHART_CSS}</style>

      <div className="breadcrumbs">
        <a href="/jouet">JOUET BILLIARDS HALL</a>
        <a href="/jouet/tournaments">Tournaments</a>
        <a href="https://cuescore.com/tournament/Open+Jouet+Ioannina+64+players+%252B1500/58737796">
          Open Jouet Ioannina 64 players +1500
        </a>
        <span>Flowchart</span>
      </div>

      <div style={{ minHeight: "100vh" }}>
        <div id="ButtonBar" className="noPrint">
          <div className="zoom">
            <button
              type="button"
              className="input in"
              onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.1).toFixed(1))))}
            >
              +
            </button>
            <div className="value">{Math.round(zoom * 100)}%</div>
            <button
              type="button"
              className="input out"
              onClick={() => setZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(1))))}
            >
              -
            </button>
          </div>
        </div>

        <div id="Content">
          <div id="cs-tournament" />
        </div>
      </div>
    </>
  );
}
