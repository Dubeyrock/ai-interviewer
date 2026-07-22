from backend.app.core.database import db

if __name__ == "__main__":
    print("Seeded sample interview data:")
    print(db.sample_state())
