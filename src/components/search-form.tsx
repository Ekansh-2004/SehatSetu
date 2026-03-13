import { Input } from "@/components/ui/input";

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  return (
    <form {...props}>
      <Input
        id="search"
        placeholder="Search"
        className="w-full bg-white border-none shadow-none text-center placeholder:text-center h-8 text-base rounded-sm p-0"
      />
    </form>
  );
}
