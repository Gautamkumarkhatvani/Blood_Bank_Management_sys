import React, { useEffect, useRef } from 'react';
import { Download, Printer, X } from 'lucide-react';
import jsPDF from 'jspdf';

const Certificate = ({ isOpen, onClose, donorData, donationData }) => {
  const certificateRef = useRef();

  const generatePDF = () => {
    if (!certificateRef.current) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const canvas = certificateRef.current.querySelector('canvas');
    if (canvas) {
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 0, 0, 297, 210);
    }

    doc.save(`certificate-${donorData.fullName}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        <div className="sticky top-0 bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Blood Donation Certificate</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-200 rounded-lg"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <div
            ref={certificateRef}
            className="bg-white border-4 border-red-600 p-8 text-center"
            style={{
              backgroundImage: 'linear-gradient(135deg, #f5f5f5 25%, transparent 25%, transparent 75%, #f5f5f5 75%, #f5f5f5)',
              backgroundSize: '20px 20px'
            }}
          >
            <h1 className="text-4xl font-bold text-red-600 mb-2">
              BLOOD DONATION CERTIFICATE
            </h1>
            <div className="h-1 w-32 bg-red-600 mx-auto mb-8"></div>

            <p className="text-lg text-gray-700 mb-4">This is to certify that</p>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              {donorData?.fullName}
            </h2>

            <p className="text-lg text-gray-700 mb-2">has voluntarily donated blood on</p>
            <p className="text-2xl font-bold text-red-600 mb-8">
              {new Date(donationData?.donationDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>

            <div className="flex justify-center gap-8 mb-8 text-lg">
              <div>
                <span className="text-gray-700">Blood Type:</span>
                <p className="text-2xl font-bold text-red-600">{donationData?.bloodGroup}</p>
              </div>
              <div>
                <span className="text-gray-700">Units Donated:</span>
                <p className="text-2xl font-bold text-red-600">{donationData?.quantity}</p>
              </div>
            </div>

            <p className="text-gray-700 italic mb-12">
              We gratefully acknowledge this generous contribution to our blood bank.<br />
              Your donation will help save many precious lives.
            </p>

            <div className="border-t border-gray-400 pt-4 text-xs text-gray-600">
              <p>Certificate ID: {donationData?._id}</p>
              <p>Issued: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={generatePDF}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default Certificate;