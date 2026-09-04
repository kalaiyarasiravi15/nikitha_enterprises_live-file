import { useState, useEffect } from 'react';
import './Categories.css';
import { API, IMG } from '../../config';

const defaultCategories = [
  { name: 'Copper Kitchenware', image: '/catagory1.jpg' },
  { name: 'Handicrafts', image: '/catagory2.jpg' },
  { name: 'Pooja Articles', image: '/catagory3.jpg' },
  { name: 'Brass kitchenware', image: '/catagory4.jpg' }
];

function Categories({ onCategoryClick }) {
  const [categories, setCategories] = useState(defaultCategories);

  useEffect(() => {
    fetch(`${API}/categories/all`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(c => ({
            name: c.name,
            image: c.image ? (c.image.startsWith('http') ? c.image : `${IMG}/${c.image}`) : '/catagory1.jpg'
          }));
          setCategories(mapped);
        }
      })
      .catch(err => {
        console.error('Error loading categories:', err);
      });
  }, []);

  return (
    <section className="categories">
      {/* Section Heading with Accent Lines */}
      <div className="categories-header-wrap">
        <span className="header-line header-line-left"></span>
        <h2 className="categories-heading">Shop By Category</h2>
        <span className="header-line header-line-right"></span>
      </div>

      {/* Category Cards Grid */}
      <div className="categories-grid">
        {categories.map((cat, i) => (
          <div
            key={i}
            className="cat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => onCategoryClick && onCategoryClick(cat.name)}
          >
            <div className="cat-img-wrap">
              <img src={cat.image} alt={cat.name} className="cat-img" />
            </div>
            <p className="cat-name">{cat.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Categories;