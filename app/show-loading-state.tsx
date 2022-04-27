import { useEffect } from "react";
import { useTransition } from "remix";
import NProgress from "nprogress";

export function useShowLoadingState() {
  const transition = useTransition();
  useEffect(() => {
    // when the state is idle then we can to complete the progress bar
    if (transition.state === "idle") {
      console.log(">> Done!");
      NProgress.done();
    }
    // and when it's something else it means it's either submitting a form or
    // waiting for the loaders of the next location so we start it
    else {
      {
        console.log(">> Start!");
        NProgress.start();
      }
    }
  }, [transition.state]);
}
