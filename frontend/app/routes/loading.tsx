import { LoadingPage } from "~/components/loading-page";

type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "FlowBoard" },
    { name: "description", content: "Loading FlowBoard" },
  ];
}

export default function Loading() {
  return <LoadingPage />;
}
