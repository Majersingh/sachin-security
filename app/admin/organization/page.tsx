"use client";
import { useState } from "react";
import { ORG_ENTITIES, ORG_CONFIGS, type OrgEntity } from "@/app/lib/org";
import OrgEntityManager from "./OrgEntityManager";

export default function OrganizationPage() {
  const [active, setActive] = useState<OrgEntity>("departments");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Structure</h1>
        <p className="text-gray-600">Manage departments, designations, teams, branches and locations</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
        {ORG_ENTITIES.map((entity) => (
          <button
            key={entity}
            onClick={() => setActive(entity)}
            className={`px-4 py-2 -mb-px border-b-2 font-medium text-sm ${
              active === entity
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {ORG_CONFIGS[entity].labelPlural}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 text-black">
        {/* Remount on tab change so state resets cleanly */}
        <OrgEntityManager key={active} entity={active} />
      </div>
    </div>
  );
}
