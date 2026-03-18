import psycopg
from app.db import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST # Import your constants

"""
THIS IS A TEMPORARY FILE!!! WILL DELETE IT LATER, ALONG WITH A1_A2_ONLINE.pdf !!!!!
"""

def upload_sample_pdf():
    try:
        # 1. Read the PDF file from your local folder
        # This file contains the Advanced SQL Online details for sections A1+A2 [cite: 2]
        with open("A1_A2_Online.pdf", "rb") as f:
            blob_data = f.read()

        # 2. Connect using your constants
        conn = psycopg.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST
        )
        cur = conn.cursor()
        
        # 3. Define the Notice Content
        # We include the specific details found in the PDF [cite: 3, 6]
        title = "Advanced SQL Online Assessment (A1+A2)"
        description = (
            "The online assessment for sections A1 and A2 is set for 55+5 minutes. "
            "Total marks are 25 (5 questions x 5 marks). Topics include complex joins, "
            "department counts, and identifying second-highest salaries. "
            "Please download the attached PDF for the full question set and sample output formats."
        ) 

        sql = """
            INSERT INTO NOTICE (staff_id, title, description, pdf_file)
            VALUES (%s, %s, %s, %s)
        """
        
        # Using 'S001' as a placeholder staff ID
        cur.execute(sql, ('STF0000001', title, description, blob_data))
        
        conn.commit()
        print("Successfully uploaded 'A1_A2_Online.pdf' to the database!") 
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            cur.close()
            conn.close()

if __name__ == "__main__":
    upload_sample_pdf()