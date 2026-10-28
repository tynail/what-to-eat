import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Opens a modal dialog on mount. Escape and the close button invoke `close`;
 * native cancellation is prevented, leaving dismissal to the caller.
 */
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      data-cy="modal"
      className="text-[#2c4434] [border:1px_solid_#dae2d1] rounded-[14px] p-[28px] w-[min(760px,_94vw)] max-h-[90vh] [box-shadow:0_25px_100px_#1e302b40] [&::backdrop]:bg-[#20312880] [&::backdrop]:[backdrop-filter:blur(3px)] [@media(max-width:760px)]:p-[20px]"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      aria-label={title}
    >
      <div className="modal-head [&&]:flex [&&]:items-center [&&]:justify-between [&&]:mb-[18px] [&&_h2]:[font:28px_Georgia,_serif] [&&_h2]:m-0 [&&_button]:text-[20px] [&&_button]:p-[3px_12px]">
        <h2 className="m-[0_0_12px] text-[21px] font-semibold leading-[1.3]">
          {title}
        </h2>
        <button
          className="[font-family:inherit] [font-size:inherit] [line-height:inherit] inline-flex items-center justify-center gap-[8px] [border:1px_solid_#d8dfd6] rounded-[8px] p-[10px_15px] bg-[#fff] text-[#294737] cursor-pointer font-semibold no-underline [&:hover]:bg-[#edf2e8] [&:disabled]:opacity-[0.5] [&:disabled]:cursor-not-allowed [&:focus-visible]:[outline:3px_solid_#bc8c32] [&:focus-visible]:[outline-offset:3px]"
          type="button"
          data-cy="modal-close"
          aria-label={t('closeDialog')}
          onClick={close}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
