def create_rapidata_job(signal_data, user_credentials):
    """Create and start a Rapidata classification job for a CrowdScope signal"""
    try:
        from rapidata import RapidataClient, CountryFilter

        rapi = RapidataClient(
            client_id=user_credentials['client_id'],
            client_secret=user_credentials['client_secret']
        )

        global_audience = rapi.audience.get_audience_by_id("global")
        if signal_data.get("countries"):
            audience = global_audience.filter([CountryFilter(signal_data["countries"])])
        else:
            audience = global_audience

        job_definition = rapi.job.create_classification_job_definition(
            name=f"CrowdScope Signal: {signal_data['name']}",
            instruction=signal_data["question"],
            answer_options=signal_data["answer_options"],
            datapoints=["../public/questionmark.jpg"],
            responses_per_datapoint=signal_data["vote_count"]
        )
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
    """Get the status of a Rapidata job (also accepts historic `ord_` ids)"""
    try:
        from rapidata import RapidataClient

        rapi = RapidataClient(client_id=client_id, client_secret=client_secret)
        job = rapi.job.get_job_by_id(job_id)
        return job.get_status()
    except Exception as e:
        print(f"Error getting Rapidata job status: {e}")
        return None

def get_rapidata_job_results(job_id, client_id, client_secret):
    """Get the results of a completed Rapidata job"""
    try:
        from rapidata import RapidataClient

        rapi = RapidataClient(client_id=client_id, client_secret=client_secret)
        job = rapi.job.get_job_by_id(job_id)
        return job.get_results()
    except Exception as e:
        print(f"Error getting Rapidata job results: {e}")
        return None

def extract_vote_counts(results):
    """Sum the per-option response counts across all datapoints of a classification result"""
    vote_counts = {}
    for datapoint in results.get('results') or []:
        for option, count in (datapoint.get('aggregatedResults') or {}).items():
            vote_counts[option] = vote_counts.get(option, 0) + count
    return vote_counts

def delete_rapidata_job(job_id, client_id, client_secret):
    """Delete a Rapidata job"""
    try:
        from rapidata import RapidataClient

        rapi = RapidataClient(client_id=client_id, client_secret=client_secret)
        job = rapi.job.get_job_by_id(job_id)
        job.delete()
        print(f"Deleted Rapidata job {job_id}")
        return True
    except Exception as e:
        print(f"Error deleting Rapidata job {job_id}: {e}")
        return False
