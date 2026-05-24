export const mediaPreviewStyles = `
  .jmp-preview-backdrop {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: none;
    pointer-events: none;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-radius: inherit;
  }

  .jmp-preview-layer {
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
    opacity: 1;
    overflow: hidden;
    background-color: transparent;
    background-repeat: no-repeat;
    background-position: 0 0;
    border-radius: inherit;
  }

  .jmp-hover-countdown {
    position: absolute;
    z-index: 24;
    display: none;
    width: 34px;
    height: 34px;
    overflow: hidden;
    pointer-events: none;
    border: 0;
    border-radius: 999px;
    background: conic-gradient(
      rgba(255, 255, 255, 0.42) calc(var(--progress, 1) * 1turn),
      rgba(255, 255, 255, 0.08) 0
    );
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  }

  .jmp-hover-countdown.pos-top-left {
    top: 10px;
    left: 10px;
  }

  .jmp-hover-countdown.pos-top-right {
    top: 10px;
    right: 10px;
  }

  .jmp-hover-countdown.pos-bottom-left {
    bottom: 10px;
    left: 10px;
  }

  .jmp-hover-countdown.pos-bottom-right {
    right: 10px;
    bottom: 10px;
  }

  .jmp-hover-countdown-label {
    position: absolute;
    inset: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(10, 14, 20, 0.76);
    color: rgba(255, 255, 255, 0.92);
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.02em;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .jmp-unavailable-message {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 26;
    display: none;
    max-width: calc(100% - 28px);
    padding: 9px 14px;
    pointer-events: none;
    transform: translate(-50%, -50%);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 999px;
    background: rgba(10, 14, 20, 0.76);
    color: rgba(232, 236, 242, 0.84);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    letter-spacing: 0.01em;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .jmp-trailer-layer {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: none;
    overflow: hidden;
    pointer-events: none;
    background: transparent;
    border-radius: inherit;
  }

  .jmp-trailer-actions {
    position: absolute;
    z-index: 45;
    display: none;
    pointer-events: none;
  }

  .jmp-trailer-actions.pos-top-left {
    top: 10px;
    left: 10px;
  }

  .jmp-trailer-actions.pos-top-right {
    top: 10px;
    right: 10px;
  }

  .jmp-trailer-actions.pos-bottom-left {
    bottom: 10px;
    left: 10px;
  }

  .jmp-trailer-actions.pos-bottom-right {
    right: 10px;
    bottom: 10px;
  }

  .jmp-trailer-expand {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    cursor: pointer;
    pointer-events: auto;
    border: 0;
    border-radius: 999px;
    background: rgba(10, 14, 20, 0.76);
    color: #fff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: transform 0.18s ease, background 0.18s ease, opacity 0.18s ease;
  }

  .jmp-trailer-expand:hover {
    transform: scale(1.06);
    background: rgba(22, 28, 38, 0.9);
  }

  .jmp-trailer-expand .material-icons {
    font-size: 19px;
    line-height: 1;
  }

  .jmp-trailer-layer.jmp-debug-visible {
    outline: 2px solid rgba(0, 255, 255, 0.9);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6) inset;
  }

  .jmp-trailer-media {
    position: absolute;
    z-index: 1;
    display: block;
    visibility: visible;
    pointer-events: none;
    border: 0;
    opacity: 1;
    background: transparent;
  }

  .jmp-progress {
    position: absolute;
    right: 8px;
    bottom: 8px;
    left: 8px;
    z-index: 90;
    height: 3px;
    overflow: hidden;
    pointer-events: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
  }

  .jmp-progress-bar {
    width: 0;
    height: 100%;
    background: rgba(255, 255, 255, 0.88);
    transform-origin: left center;
  }

  .jmp-expanded-trailer-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: none;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.24s ease;
  }

  .jmp-expanded-trailer-overlay.is-open {
    opacity: 1;
    pointer-events: auto;
  }

  .jmp-expanded-trailer-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(5, 8, 14, 0.72);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .jmp-expanded-trailer-viewport {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    overflow: hidden;
    pointer-events: auto;
    border-radius: 22px;
    background: #000;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
    transition:
      left 0.24s ease,
      top 0.24s ease,
      width 0.24s ease,
      height 0.24s ease,
      border-radius 0.24s ease;
  }

  .jmp-expanded-trailer-media-host {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: auto;
    border-radius: inherit;
  }

  .jmp-expanded-trailer-shell {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .jmp-expanded-trailer-ui {
    position: absolute;
    top: 20px;
    right: 20px;
    left: 20px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    pointer-events: none;
  }

  .jmp-expanded-trailer-title {
    display: none;
  }

  .jmp-expanded-trailer-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    cursor: pointer;
    pointer-events: auto;
    border: 0;
    border-radius: 999px;
    background: rgba(10, 14, 20, 0.76);
    color: #fff;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .jmp-expanded-trailer-close:hover {
    transform: scale(1.06);
    background: rgba(22, 28, 38, 0.92);
  }

  .jmp-expanded-trailer-close .material-icons {
    font-size: 22px;
    line-height: 1;
  }

  .jmp-trailer-media.jmp-interactive {
    pointer-events: auto;
  }
`;
