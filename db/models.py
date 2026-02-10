"""SQLAlchemy ORM models for the rent arbitrage tracker."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Listing(Base):
    """Raw rental listing scraped from various sources."""

    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String(2048), nullable=False, unique=True, index=True)
    source = Column(String(64), nullable=False, index=True)  # "craigslist" | "apartments"
    zip_code = Column(String(10), nullable=False, index=True)
    price = Column(Float, nullable=True)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Float, nullable=True)
    sqft = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    scraped_at = Column(DateTime, nullable=False, default=func.now())
    listing_date = Column(DateTime, nullable=True)

    scored = relationship("ScoredListing", back_populates="listing", uselist=False)

    def __repr__(self) -> str:
        return (
            f"<Listing(id={self.id}, source={self.source!r}, "
            f"zip={self.zip_code}, price={self.price})>"
        )


class ScoredListing(Base):
    """Scored listing with z-score and underpriced flag (written by PySpark pipeline)."""

    __tablename__ = "scored_listings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False, unique=True, index=True)
    rolling_median = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    is_underpriced = Column(Boolean, nullable=False, default=False)
    scored_at = Column(DateTime, nullable=False, default=func.now())

    listing = relationship("Listing", back_populates="scored")

    __table_args__ = (
        UniqueConstraint("listing_id", name="uq_scored_listing_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<ScoredListing(listing_id={self.listing_id}, "
            f"z_score={self.z_score:.2f}, underpriced={self.is_underpriced})>"
        )
