import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/build")({
  component: BuildLayout,
});

function BuildLayout() {
  return <Outlet />;
}