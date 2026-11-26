import jsPDF from 'jspdf';

export const generateDonationCertificate = (donorData, donationData) => {
  try {
    console.log("📜 Generating certificate...");

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Background
    doc.setFillColor(240, 240, 250);
    doc.rect(0, 0, 297, 210, 'F');

    // Border
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190);

    doc.setDrawColor(220, 0, 0);
    doc.setLineWidth(1);
    doc.rect(13, 13, 271, 184);

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(200, 0, 0);
    doc.text('BLOOD DONATION CERTIFICATE', 148.5, 40, { align: 'center' });

    // Decorative line
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(1);
    doc.line(80, 48, 217, 48);

    // Body text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    doc.text('This is to certify that', 148.5, 65, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(200, 0, 0);
    doc.text(donorData.fullName, 148.5, 78, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('has voluntarily donated blood on', 148.5, 92, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(200, 0, 0);
    const donationDate = new Date(donationData.donationDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(donationDate, 148.5, 105, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Blood Type:', 80, 125);
    doc.setFont('helvetica', 'bold');
    doc.text(donationData.bloodGroup, 110, 125);

    doc.setFont('helvetica', 'normal');
    doc.text('Units Donated:', 80, 140);
    doc.setFont('helvetica', 'bold');
    doc.text(donationData.quantity.toString(), 110, 140);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(
      'We gratefully acknowledge this generous contribution to our blood bank.\nYour donation will help save many precious lives.',
      148.5,
      160,
      { align: 'center', maxWidth: 150 }
    );

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Certificate ID: ${donationData._id}`,
      80,
      195
    );
    doc.text(
      `Issued: ${new Date().toLocaleDateString()}`,
      250,
      195,
      { align: 'right' }
    );

    const pdfBuffer = doc.output('arraybuffer');
    return pdfBuffer;

  } catch (error) {
    console.error("❌ Certificate generation error:", error);
    throw error;
  }
};