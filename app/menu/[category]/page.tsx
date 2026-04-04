import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ table?: string }>;
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const { table } = await searchParams;

  const query = new URLSearchParams({ scrollTo: category });
  if (table) query.set("table", table);

  redirect(`/menu/all?${query.toString()}`);
}
