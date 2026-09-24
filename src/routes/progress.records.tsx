import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/recomp/core";
import { InlineEmpty, RecordRow, SubHeader } from "@/components/recomp/progress/progress-widgets";
import { personalRecords, useTrainingData } from "@/lib/training-data";

export const Route = createFileRoute("/progress/records")({
  head: () => ({ meta: [{ title: "Personal Records — RECOMP'D" }, { name: "description", content: "Your best lifts for every exercise, from recorded workouts." }, { property: "og:title", content: "Personal Records — RECOMP'D" }, { property: "og:description", content: "Your best lifts for every exercise, from recorded workouts." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: RecordsPage,
});

function RecordsPage() {
  const data = useTrainingData();
  const records = data ? personalRecords(data.workouts).all : [];
  return (
    <Screen>
      <SubHeader title="Personal records" />
      {data && <Card className="divide-y divide-border px-4">{records.length ? records.map((record) => <RecordRow key={record.exerciseId} record={record} detail />) : <InlineEmpty>No records yet</InlineEmpty>}</Card>}
    </Screen>
  );
}
