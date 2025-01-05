import React from "react";

interface UploadProps {
  file: File | null;
  moduleName: string;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  setModuleName: React.Dispatch<React.SetStateAction<string>>;
  handleUpload: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}

const TestModuleUpload: React.FC<UploadProps> = ({
  file,
  moduleName,
  setFile,
  setModuleName,
  handleUpload,
  loading,
}) => {
  return (
    <div className="bg-[#00004d] p-6 rounded-3xl shadow-lg w-1/2 flex flex-col justify-center items-center h-full">
      <h2 className="text-xl font-bold mb-4 text-center">Upload Your Test Module</h2>
      <form onSubmit={handleUpload} className="w-full flex flex-col items-center">
        <label htmlFor="moduleName" className="block mb-2 text-center">
          Test Module Name
        </label>
        <input
          type="text"
          id="moduleName"
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          className="mb-4 p-2 border border-gray-300 w-3/4 text-black rounded-full"
          placeholder="Enter module name"
        />
        <label htmlFor="fileUpload" className="block mb-2 text-center">
          Choose Your Test Module
        </label>
        <div className="relative w-3/4 max-w-md mb-6">
          <input
            type="file"
            accept="application/json"
            id="fileUpload"
            name="testFile"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) setFile(e.target.files[0]);
            }}
          />
          <label
            htmlFor="fileUpload"
            className="bg-[#ac53a6] h-12 w-full rounded-full flex items-center justify-center cursor-pointer"
          >
            <span className="text-white font-bold text-sm">{file ? file.name : "CHOOSE FILE"}</span>
          </label>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[#eab2bb] text-black font-bold rounded-full"
        >
          {loading ? "Uploading..." : "Upload Module"}
        </button>
      </form>
    </div>
  );
};

export default TestModuleUpload;