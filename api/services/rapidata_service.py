def _vote_counts(results):
    counts = {}
    for item in results.get("results", []):
        for option, count in (item.get("aggregatedResults") or {}).items():
            counts[option] = counts.get(option, 0) + count
    return counts


def create_rapidata_job(signal_data, user_credentials):
    """Create and start a Rapidata classification job for a CrowdScope signal"""
    try:
        from rapidata import RapidataClient, CountryFilter

        rapi = RapidataClient(
            client_id=user_credentials['client_id'],
            client_secret=user_credentials['client_secret']
        )

        job_definition = rapi.job.create_classification_job_definition(
            name=f"CrowdScope Signal: {signal_data['name']}",
            instruction=signal_data["question"],
            answer_options=signal_data["answer_options"],
            datapoints=["../public/questionmark.jpg"],
            responses_per_datapoint=signal_data["vote_count"],
        )

        audience = rapi.audience.get_audience_by_id("global")
        if signal_data.get("countries"):
            audience = audience.filter([CountryFilter(signal_data["countries"])])

        job = audience.assign_job(job_definition)

        return {
            "success": True,
            "rapidata_job_id": str(job.id),
            "message": f"Successfully created Rapidata job for signal {signal_data['signal_id']}"
        }

    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": "Failed to create Rapidata job",
            "details": f"{str(e)}\n{traceback.format_exc()}"
        }

def get_rapidata_job_status(job_id, client_id, client_secret):
    """Get the status of a Rapidata job"""
    try:
        from rapidata import RapidataClient

        rapi = RapidataClient(client_id=client_id, client_secret=client_secret)
        return rapi.job.get_job_by_id(job_id).get_status()
    except Exception as e:
        print(f"Error getting Rapidata job status: {e}")
        return None

def get_rapidata_job_vote_counts(job_id, client_id, client_secret):
    """Get the per-option vote counts of a completed Rapidata job"""
    try:
        from rapidata import RapidataClient

        rapi = RapidataClient(client_id=client_id, client_secret=client_secret)
        return _vote_counts(rapi.job.get_job_by_id(job_id).get_results())
    except Exception as e:
        print(f"Error getting Rapidata job results: {e}")
        return None

def delete_rapidata_job(job_id, client_id, client_secret):
    """Delete a Rapidata job"""
    try:
        from rapidata import RapidataClient

        rapi = RapidataClient(client_id=client_id, client_secret=client_secret)
        rapi.job.get_job_by_id(job_id).delete()
        print(f"Deleted Rapidata job {job_id}")
        return True
    except Exception as e:
        print(f"Error deleting Rapidata job {job_id}: {e}")
        return False
