import qrcode
from io import BytesIO

def generate_qr_code(data: str) -> BytesIO:
    """
    Generate a QR code from a given string.

    Args:
        data (str): The string to encode in the QR code.

    Returns:
        BytesIO: A BytesIO object containing the QR code image in PNG format.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    img_io = BytesIO()
    img.save(img_io, format="PNG")
    img_io.seek(0)
    return img_io
