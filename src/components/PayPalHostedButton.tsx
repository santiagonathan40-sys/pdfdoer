type PayPalHostedButtonProps = {
  clientId?: string;
  hostedButtonId?: string;
  label?: string;
  disabledMessage?: string;
  buttonSize?: "small" | "large";
};

export default function PayPalHostedButton({
  hostedButtonId,
  label,
  disabledMessage = "PayPal button coming soon.",
  buttonSize = "large",
}: PayPalHostedButtonProps) {
  if (!hostedButtonId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
        <p className="text-sm font-medium text-gray-700">{label || "Pro Access"}</p>
        <p className="mt-1 text-sm text-gray-500">{disabledMessage}</p>
      </div>
    );
  }

  const buttonImage =
    buttonSize === "small"
      ? "https://www.paypalobjects.com/en_US/i/btn/btn_subscribe_SM.gif"
      : "https://www.paypalobjects.com/en_US/i/btn/btn_subscribe_LG.gif";

  return (
    <div className="w-full text-center">
      {label && <p className="mb-3 text-center text-sm font-semibold text-gray-700">{label}</p>}

      <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
        <input type="hidden" name="cmd" value="_s-xclick" />
        <input type="hidden" name="hosted_button_id" value={hostedButtonId} />
        <input type="hidden" name="currency_code" value="USD" />

        <input
          type="image"
          src={buttonImage}
          border={0}
          name="submit"
          title="PayPal - The safer, easier way to pay online!"
          alt="Subscribe"
          className="mx-auto"
        />
      </form>
    </div>
  );
}