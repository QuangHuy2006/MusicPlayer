import React from 'react';
import { VscChromeMinimize, VscChromeMaximize, VscChromeRestore, VscChromeClose } from 'react-icons/vsc';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false);

  const ipc = (window as any).ipcRenderer as { send: (channel: string) => void } | undefined;

  const handleMinimize = () => {
    ipc?.send('window-minimize');
  };

  const handleMaximize = () => {
    ipc?.send('window-maximize');
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    ipc?.send('window-close');
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region">
        <div className="titlebar-title text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase ml-4">
           Q.HUY Music
        </div>
      </div>
      <div className="titlebar-controls">
        <button onClick={handleMinimize} className="titlebar-button minimize" title="Minimize">
          <VscChromeMinimize />
        </button>
        <button onClick={handleMaximize} className="titlebar-button maximize" title={isMaximized ? "Restore" : "Maximize"}>
          {isMaximized ? <VscChromeRestore /> : <VscChromeMaximize />}
        </button>
        <button onClick={handleClose} className="titlebar-button close" title="Close">
          <VscChromeClose />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
