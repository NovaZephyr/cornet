import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ShellSearchProps = { historical?: boolean; cosmephant?: boolean };

export function ShellSearch({ historical = false, cosmephant = false }: ShellSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void navigate({ to: "/", search: query.trim() ? { q: query.trim() } : {} });
  };

  return (
    <form className={historical ? "cn-shell-search cn-shell-search--historical" : cosmephant ? "cn-shell-search cn-shell-search--cosmephant" : "cn-shell-search"} onSubmit={handleSubmit}>
      <Search className="h-4 w-4" aria-hidden="true" />
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={cosmephant ? "" : "Buscar en Cornet"} aria-label="Buscar en Cornet" />
      <Button type="submit" variant="ghost" size={historical ? "sm" : "icon"} aria-label="Buscar">
        {historical ? "Search" : <Search className="h-4 w-4" />}
      </Button>
    </form>
  );
}
