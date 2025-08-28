def create_rapidata_order(signal_data, user_credentials):
    """Create a Rapidata order for a CrowdScope signal"""
    try:
        from rapidata import RapidataClient, CountryFilter
        
        rapi = RapidataClient(
            client_id=user_credentials['client_id'],
            client_secret=user_credentials['client_secret']
        )
        
        order_kwargs = {
            "name": f"CrowdScope Signal: {signal_data['name']}",
            "instruction": signal_data["question"],
            "answer_options": signal_data["answer_options"],
            "datapoints": ["../public/questionmark.jpg"],
            "responses_per_datapoint": signal_data["vote_count"]
        }
        
        if signal_data.get("countries"):
            order_kwargs["filters"] = [CountryFilter(signal_data["countries"])]
        
        order = rapi.order.create_classification_order(**order_kwargs)
        order.run()
        
        return {
            "success": True,
            "rapidata_order_id": str(order.id) if hasattr(order, 'id') else "unknown",
            "message": f"Successfully created Rapidata order for signal {signal_data['signal_id']}"
        }
        
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": "Failed to create Rapidata order",
            "details": f"{str(e)}\n{traceback.format_exc()}"
        }

def get_rapidata_order_status(order_id, client_id, client_secret):
    """Get the status of a Rapidata order"""
    try:
        from rapidata import RapidataClient
        
        rapi = RapidataClient(client_id=client_id, client_secret=client_secret)
        order = rapi.order.get_order_by_id(order_id)
        return order.get_status()
    except Exception as e:
        print(f"Error getting Rapidata order status: {e}")
        return None

def get_rapidata_order_results(order_id, client_id, client_secret):
    """Get the results of a completed Rapidata order"""
    try:
        from rapidata import RapidataClient
        
        rapi = RapidataClient(client_id=client_id, client_secret=client_secret)
        order = rapi.order.get_order_by_id(order_id)
        return order.get_results()
    except Exception as e:
        print(f"Error getting Rapidata order results: {e}")
        return None

def delete_rapidata_order(order_id, client_id, client_secret):
    """Delete a Rapidata order"""
    try:
        from rapidata import RapidataClient
        
        rapi = RapidataClient(client_id=client_id, client_secret=client_secret)
        order = rapi.order.get_order_by_id(order_id)
        order.delete()
        print(f"Deleted Rapidata order {order_id}")
        return True
    except Exception as e:
        print(f"Error deleting Rapidata order {order_id}: {e}")
        return False