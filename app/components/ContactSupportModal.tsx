"use client";

import { Phone, MessageCircle } from "lucide-react";

export default function ContactSupportModal() {
    const phoneNumber = "+919583967497";
    const displayPhoneNumber = "+91 9583967497";

    return (
        <dialog id="contact_support_modal" className="modal modal-bottom sm:modal-middle">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">Contact Support</h3>

                <div className="flex flex-col gap-4">
                    <div className="text-center mb-2">
                        <p className="text-lg font-semibold">{displayPhoneNumber}</p>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <a
                            href={`https://wa.me/${phoneNumber.replace('+', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-success text-white flex-1"
                        >
                            <MessageCircle size={20} />
                            WhatsApp
                        </a>

                        <a
                            href={`tel:${phoneNumber}`}
                            className="btn btn-primary flex-1"
                        >
                            <Phone size={20} />
                            Call
                        </a>
                    </div>
                </div>

                <div className="modal-action">
                    <form method="dialog">
                        {/* if there is a button in form, it will close the modal */}
                        <button className="btn">Close</button>
                    </form>
                </div>
            </div>
            {/* Click outside to close */}
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    );
}
