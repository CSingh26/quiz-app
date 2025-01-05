import React from "react";

interface Module {
  name: string;
  id: string;
}

interface ViewProps {
  modules: Module[];
  deleteModule: (id: string) => void;
  loading: boolean;
}

const TestModuleView: React.FC<ViewProps> = ({ modules, deleteModule, loading }) => {
  if (loading) {
    return <p>Loading...</p>;
  }

  if (modules.length === 0) {
    return <p>No modules available</p>;
  }

  return (
    <div className="flex flex-wrap gap-4">
      {modules.map((module) => (
        <div
          key={module.id}
          className="bg-[#eab2bb] text-black p-4 rounded-lg shadow w-64"
        >
          <h3 className="font-bold text-center mb-2">{module.name}</h3>
          <button
            onClick={() => deleteModule(module.id)}
            className="px-4 py-2 bg-red-500 text-white font-bold rounded"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};

export default TestModuleView;