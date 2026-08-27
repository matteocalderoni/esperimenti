# robot_server/behaviors/base.py

class BaseBehavior:
    def __init__(self, context):
        """
        context: Reference to the main Functions orchestrator object.
        """
        self.context = context

    def setup(self):
        """
        Optional setup phase.
        """
        pass

    def process(self, last_status):
        """
        Executes one loop cycle of the behavior.
        Returns the updated last_status.
        """
        raise NotImplementedError
