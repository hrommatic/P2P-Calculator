import React, { useCallback, useRef, useState } from "react";
import { ButtonLoader } from "./Loader";
import { disabledControlClass } from "../../lib/disabled-control-class";

type AsyncButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> & {
  onClick?: (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void | Promise<void>;
  loading?: boolean;
  loadingLabel?: string;
};

export const AsyncButton: React.FC<AsyncButtonProps> = ({
  onClick,
  disabled,
  loading,
  loadingLabel,
  children,
  className = "",
  type = "button",
  ...rest
}) => {
  const pendingRef = useRef(false);
  const [internalPending, setInternalPending] = useState(false);

  const isBusy = loading || internalPending;

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick || isBusy || disabled) return;
      const result = onClick(event);
      if (result && typeof (result as Promise<void>).then === "function") {
        if (pendingRef.current) return;
        pendingRef.current = true;
        setInternalPending(true);
        try {
          await result;
        } finally {
          pendingRef.current = false;
          setInternalPending(false);
        }
      }
    },
    [onClick, isBusy, disabled],
  );

  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || isBusy}
      onClick={handleClick}
      className={`${disabledControlClass} ${className}`.trim()}
    >
      {isBusy && loadingLabel ? (
        <ButtonLoader label={loadingLabel} />
      ) : (
        children
      )}
    </button>
  );
};
