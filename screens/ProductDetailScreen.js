import React from 'react';
import ProductDetailCard from '../components/ProductDetailCard';

const ProductDetailScreen = ({ route, navigation }) => {
  const { product, userAllergens, productCode, productName } = route.params;
  return (
    <ProductDetailCard
      product={product}
      userAllergens={userAllergens}
      navigation={navigation}
      onClearProduct={() => navigation.goBack()}
      productCode={productCode}
      productName={productName}
    />
  );
};

export default ProductDetailScreen;