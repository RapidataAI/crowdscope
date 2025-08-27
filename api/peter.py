from rapidata import RapidataClient

rapi = RapidataClient()
rapi.order.create_classification_order(
            name=f"CrowdScope Signal: asd",
            instruction="Do you like Peter?",
            answer_options=["Yes", "No"],
            datapoints=["../public/questionmark.jpg"]
        ).run()