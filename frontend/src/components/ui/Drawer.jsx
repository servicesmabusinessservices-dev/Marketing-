import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Icon from './Icon';
import './Drawer.css';

const Drawer = ({ open, onClose, title, children }) => (
  <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="drawer-overlay" />
      <Dialog.Content className="drawer-content" aria-describedby={undefined}>
        <div className="drawer-header">
          <Dialog.Title className="drawer-title">{title}</Dialog.Title>
          <Dialog.Close asChild>
            <button className="drawer-close" aria-label="Close">
              <Icon name="chevron" size={18} decorative />
            </button>
          </Dialog.Close>
        </div>
        <div className="drawer-body">
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default Drawer;
