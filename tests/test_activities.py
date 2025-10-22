from fastapi.testclient import TestClient
import pytest

from src.app import app, activities

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # check a known activity exists
    assert "Chess Club" in data


def test_signup_and_duplicate_signup():
    activity = "Chess Club"
    email = "test_student@mergington.edu"

    # Ensure email not present
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert resp.json()["message"].startswith("Signed up")
    assert email in activities[activity]["participants"]

    # Duplicate signup should fail
    dup = client.post(f"/activities/{activity}/signup?email={email}")
    assert dup.status_code == 400


def test_unregister_and_errors():
    activity = "Chess Club"
    email = "temp_remove@mergington.edu"

    # Ensure email is registered first
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 200
    assert resp.json()["message"].startswith("Unregistered")
    assert email not in activities[activity]["participants"]

    # Unregistering again should return 400
    resp2 = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp2.status_code == 400


def test_signup_nonexistent_activity():
    resp = client.post("/activities/Nonexistent%20Club/signup?email=someone@a.com")
    assert resp.status_code == 404


def test_unregister_nonexistent_activity():
    resp = client.post("/activities/Nonexistent%20Club/unregister?email=someone@a.com")
    assert resp.status_code == 404
