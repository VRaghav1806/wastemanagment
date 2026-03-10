from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Register Blueprints
    from app.routes.dashboard import dashboard_bp
    from app.routes.bins import bins_bp
    from app.routes.ai import ai_bp
    from app.routes.logistics import logistics_bp
    from app.routes.citizen import citizen_bp
    from app.routes.circular import circular_bp
    from app.routes.simulation import simulation_bp

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(bins_bp)
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(logistics_bp)
    app.register_blueprint(citizen_bp)
    app.register_blueprint(circular_bp)
    app.register_blueprint(simulation_bp)

    return app
