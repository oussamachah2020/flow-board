import { redirect } from "react-router";

type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "FlowBoard" },
    { name: "description", content: "Welcome to FlowBoard" },
  ];
}

export function loader() {
  return redirect("/loading");
}

export default function Index() {
  return null;
}
