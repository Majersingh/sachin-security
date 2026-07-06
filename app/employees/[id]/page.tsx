import { MongoClient } from "mongodb";
import { notFound } from "next/navigation";
import { ShieldCheck, ShieldAlert, User, Phone, Briefcase, Award } from "lucide-react";
import { getCollection } from '@/app/lib/db';



// डेटाबेस से कर्मचारी ढूंढने का फंक्शन
async function getEmployee(employeeId: string) {

  try {    
    // सुरक्षा: केवल जरूरी जानकारी (Projection) ही डेटाबेस से मंगाएं
    const collection = await getCollection("employees")
    const employee=await collection.findOne(
      { employeeId: employeeId },
      {
        projection: {
          fullName: 1,
          profileUrl: 1,
          designation: 1,
          department: 1,
          employeeId: 1,
          status: 1,
          bloodGroup: 1,
          mobileNumber: 1,
          workLocation: 1,
          joiningDate: 1
        }
      }
    );
    return employee;
  } catch (error) {
    console.error("डेटाबेस एरर:", error);
    return null;
  }
}

export default async function EmployeeVerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);

  // यदि कर्मचारी डेटाबेस में नहीं मिलता है तो 404 पेज दिखाएं
  if (!employee) {
    notFound();
  }

  // चेक करें कि कर्मचारी एक्टिव है या नहीं
  const isActive = employee.status === "Active";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans text-black">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        
        {/* कंपनी नाम और वेरिफिकेशन स्टेटस बार */}
        <div className={`p-6 text-center text-white transition-colors duration-300 ${isActive ? "bg-emerald-600" : "bg-rose-600"}`}>
          <h1 className="text-xl font-bold uppercase tracking-wide">Sachin Security Services</h1>
          <p className="text-xs text-white/80 mt-1">Official Staff Verification</p>
          
          {/* लाइव वेरिफिकेशन बैज */}
          <div className="inline-flex items-center gap-2 bg-white/25 px-4 py-1.5 rounded-full mt-4 text-sm font-semibold backdrop-blur-sm">
            {isActive ? (
              <>
                <ShieldCheck className="w-5 h-5 text-white" />
                <span>Verified Active Staff</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 text-white" />
                <span>Inactive / Terminated</span>
              </>
            )}
          </div>
        </div>

        {/* कर्मचारी की प्रोफाइल फोटो */}
        <div className="flex justify-center -mt-12">
          <div className="w-24 h-24 bg-gray-200 rounded-full border-4 border-white shadow-md overflow-hidden">
            {employee.profileUrl ? (
              <img src={employee.profileUrl} alt={employee.fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white">
                <User className="w-10 h-10" />
              </div>
            )}
          </div>
        </div>

        {/* नाम और पद */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{employee.fullName}</h2>
          <p className="text-amber-600 font-semibold text-sm mt-0.5">{employee.designation}</p>
          <p className="text-gray-500 text-xs">{employee.department} Department</p>
        </div>

        {/* रिकॉर्ड डिटेल्स की लिस्ट */}
        <div className="border-t border-gray-100 px-6 py-4 space-y-4 bg-gray-50/50">
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-2"><Award className="w-4 h-4" /> Employee ID</span>
            <span className="font-bold text-gray-800">{employee.employeeId}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Work Location</span>
            <span className="font-medium text-gray-800">{employee.workLocation || "N/A"}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-2"><Phone className="w-4 h-4" /> Mobile Number</span>
            <span className="font-medium text-gray-800">{employee.mobileNumber}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Blood Group</span>
            <span className="font-bold text-rose-600">{employee.bloodGroup || "N/A"}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Joining Date</span>
            <span className="font-medium text-gray-800">{employee.joiningDate || "N/A"}</span>
          </div>

        </div>

        {/* फुटर नोट */}
        <div className="p-4 bg-gray-100 text-center text-[10px] text-gray-400 border-t border-gray-200">
          This is a live security verification receipt. Generated on {new Date().toLocaleDateString('en-IN')}.
        </div>

      </div>
    </div>
  );
}
