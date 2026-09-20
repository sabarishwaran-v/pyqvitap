import { LoaderIcon } from "lucide-react";

function Loader({ prop = "m-52" }) {
  return (
    <div
      className={`${prop} flex items-center justify-center bg-gradient-to-br`}
    >
      <LoaderIcon className="animate-spin" />
    </div>
  );
}

export default Loader;
